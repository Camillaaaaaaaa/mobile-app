const vertex = /*glsl*/`
precision mediump float;
precision mediump int;

uniform vec2 u_resolution;
uniform vec2 texSize;

varying vec2 vTexCoord;

uniform sampler2D tex0;

uniform float colorM[15];

float get_matrix_pos(vec2 pos){
  int x_index= int(pos.x*3.);
  int y_index= int(pos.y*5.);

  float col_index = 0.;
  
  // get number in matrix
  for( int i = 0; i<3; i++){
    for(int j = 0; j<5; j++){
      if (x_index== i && y_index==j)
        col_index = colorM[i+3*(4-j)];
    }
  }
  
  return col_index;
}

//----------------------------------------------------------------
// color vision deficiency
//----------------------------------------------------------------

//https://mk.bcgsc.ca/colorblind/math.mhtml
vec3 get_protanopia(vec3 col){
  mat3 pro;
  // set rows
  pro[0]= vec3(0.170556992, 0.829442014,0.);
  pro[1]= vec3(0.170556991, 0.829442008, 0.);
  pro[2]= vec3(-0.004517144, 0.004517144, 1.);
  
  
  return col.xyz *pro;
}

vec3 get_deuteranopia(vec3 col){
  mat3 deut;
  deut[0]= vec3(0.33066007, 0.66933993, 0.);
  deut[1]= vec3(0.33066007, 0.66933993, 0.);
  deut[2]= vec3(-0.02785538, 0.02785538, 1.);
  
  
  return col.xyz *deut;
}

vec3 get_tritanopia(vec3 col){
  mat3 tri;
  tri[0]= vec3(1., 0.1273989, -0.1273989);
  tri[1]= vec3(0., 0.9739093, 0.1260907);
  tri[2]= vec3(0., 0.9739093, 0.1260907);
  
  
  return col.xyz *tri;
}

vec3 get_achromatopsia (vec3 col){
  mat3 achro;
  achro[0]= vec3(0.2126, 0.7152, 0.0722);
  achro[1]= vec3(0.2126, 0.7152, 0.0722);
  achro[2]= vec3(0.2126, 0.7152, 0.0722);
  
  
  return col.xyz *achro;
}

//----------------------------------------------------------------
// kernel
//----------------------------------------------------------------

float black_white(vec3 c){
  return (c.r+c.g+c.b)/3.;
}

float blur(vec2 pos,vec2 texOffset){
  float blur_col=0.;

  //maybe i and j the wrong way around
  for(int i = -7;i<=7;i++){
    for(int j = -7;j<=7;j++){
      blur_col+=black_white(texture2D(tex0, pos+vec2(i,j)*texOffset).rgb);
      }
  }
  
  blur_col/= 169.;
  
  return blur_col;
}

float edge_detection(vec2 pos,vec2 texOffset){
  mat3 pixel_val;

  //maybe i and j the wrong way around
  for(int i = 0;i<3;i++){
    for(int j = 0;j<3;j++){
      pixel_val[i][j]=black_white(texture2D(tex0, pos+vec2(i-1,j-1)*texOffset).rgb);
      }
  }
  
  //mat3 edge=mat3(-1.,-1.,-1.,-1.,8.,-1.,-1.,-1.,-1.);
  mat3 sobel_edge_x=mat3(-1.,-2.,-1.,0.,0.,0.,1.,2.,1.);
  mat3 sobel_edge_y=mat3(-1.,0.,1.,-2.,0.,2.,-1.,0.,1.);
  
  float edge_col_x= 0.;
  float edge_col_y= 0.;

  for(int i = 0;i<3;i++){
    for(int j = 0;j<3;j++){
      edge_col_x+=pixel_val[i][j]*sobel_edge_x[i][j];
      edge_col_y+=pixel_val[i][j]*sobel_edge_y[i][j];
    }
  }

  // Normalize the result to keep it in [0, 1] range
  //edge_col = (edge_col + 1.) / 2.0;
  float edge_col= sqrt(edge_col_x*edge_col_x+edge_col_y*edge_col_y);

  return edge_col;
}

//----------------------------------------------------------------
// grid
//----------------------------------------------------------------
//https://godotshaders.com/shader/grid-shader-tutorial/

float draw_grid(vec2 uv){
  vec2 grid_uv = cos((uv)* vec2(12.,9.)*6.283);

  float val_x= step(0.999,grid_uv.x);
  float val_y= step(0.998,grid_uv.y);
  float val = max(val_x,val_y);

  return val;
}

//----------------------------------------------------------------
// main
//----------------------------------------------------------------

void main(){
    vec2 texOffset = vec2(1.0) / texSize;
    vec2 newPos = gl_FragCoord.xy/u_resolution.xy;
    //vec2 newPos = gl_FragCoord.xy;
    //vec2 newPos =vTexCoord/u_resolution.xy;
    // flip y and x axis
    //newPos.y = 1. - newPos.y;
    //newPos.x = 1. - newPos.x;
    
    vec3 col = texture2D(tex0, newPos).rgb;
    //vec2 col= newPos/u_resolution.xy;

    float col_index= get_matrix_pos(newPos);
    //float col_index= 0.;
  
    vec3 finalC=vec3(draw_grid(newPos));

    //if (draw_grid(newPos)==1.)
      //finalC=vec3(0.);
    if(col_index==0.)
        finalC= col;
    else if (col_index<=1.)
        finalC= mix(col,get_protanopia(col), col_index);
    else if (col_index<=2.)
      finalC= vec3(blur(newPos,texOffset));
    else if (col_index<=3.)
        finalC= mix(col,get_tritanopia(col), col_index-2.);
    else if (col_index<=4.)
      finalC= mix(col,vec3(1.), 0.3);
    else if (col_index<=5.)
      finalC= mix(col,get_deuteranopia(col), col_index-4.);
    else if (col_index<=6.)
      finalC= mix(col,get_achromatopsia(col), col_index-5.);
    else if (col_index<=7.)
      finalC= vec3(edge_detection(newPos,texOffset));
    
    gl_FragColor = vec4(finalC,1.);
}`;
export default vertex;